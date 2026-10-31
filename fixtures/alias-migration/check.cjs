// §7/§9 0.8.0 gate: with `debug` overridden to modern-debug, real dependents must resolve
// OUR package and their diagnostics must flow through /compat. Exits non-zero on failure.
'use strict'
process.env.DEBUG = '*'
process.env.DEBUG_COLORS = 'false'

const assert = require('node:assert')
const fs = require('node:fs')
const http = require('node:http')
const { createRequire } = require('node:module')
const path = require('node:path')

let captured = ''
const originalWrite = process.stderr.write.bind(process.stderr)
process.stderr.write = (chunk) => {
  captured += String(chunk)
  return true
}

const restore = () => {
  process.stderr.write = originalWrite
}

const main = async () => {
  // 1. the override resolves to our compat CJS entry, for us and for every transitive dependent
  const real = (p) => fs.realpathSync(p).replaceAll('\\', '/')
  const debugPath = real(require.resolve('debug'))
  assert(
    debugPath.endsWith('/dist/compat-cjs.js'),
    `debug must resolve to modern-debug's dist/compat-cjs.js, got: ${debugPath}`,
  )
  // Resolve `debug` from inside each dependent's own install dir (located via its main entry); `debug/package.json` is not exported, so resolved entry files are compared, not package.json paths.
  const locate = (name, from = __dirname) => createRequire(path.join(from, 'noop.js')).resolve(name)
  const debugFrom = (entry) => real(createRequire(entry).resolve('debug'))
  const expressEntry = locate('express')
  const socketIoEntry = locate('socket.io')
  const dependents = {
    express: expressEntry,
    send: locate('send'),
    'socket.io': socketIoEntry,
    'socket.io-client': locate('socket.io-client'),
    router: locate('router', path.dirname(expressEntry)),
    'body-parser': locate('body-parser', path.dirname(expressEntry)),
    finalhandler: locate('finalhandler', path.dirname(expressEntry)),
    'engine.io': locate('engine.io', path.dirname(socketIoEntry)),
    'socket.io-adapter': locate('socket.io-adapter', path.dirname(socketIoEntry)),
  }
  for (const [name, entry] of Object.entries(dependents)) {
    assert.strictEqual(debugFrom(entry), debugPath, `${name} must resolve debug to modern-debug`)
  }
  const strays = fs
    .readdirSync(path.join(__dirname, 'node_modules', '.pnpm'))
    .filter((d) => d.startsWith('debug@'))
  assert.deepStrictEqual(strays, [], 'no registry debug@* directory in the virtual store')
  const dbg = require('debug')
  assert.strictEqual(typeof dbg, 'function', 'factory is callable')
  assert.strictEqual(typeof dbg.humanize, 'function', 'humanize exists')
  assert.strictEqual(typeof dbg.enable, 'function', 'enable exists')
  const probe = dbg('fixture:probe')
  probe('probe line %s', 'ok')
  assert(captured.includes('fixture:probe probe line ok'), 'probe printf line emitted')

  // 2. express 5 request cycle logs through the alias
  const express = require('express')
  const send = require('send')
  const app = express()
  app.get('/ping', (_req, res) => {
    res.send('pong')
  })
  app.get('/file', (req, res) => {
    send(req, 'check.cjs', { root: __dirname }).pipe(res)
  })

  const server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  const port = server.address().port
  const get = (path) =>
    new Promise((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path }, (res) => {
          let body = ''
          res.on('data', (c) => {
            body += String(c)
          })
          res.on('end', () => resolve(body))
        })
        .on('error', reject)
    })

  const pong = await get('/ping')
  assert.strictEqual(pong, 'pong', 'express serves')
  const file = await get('/file')
  assert(file.includes('alias-migration'), 'send streams the file')

  // 3. socket.io handshake logs through the alias
  const { Server } = require('socket.io')
  const { io: ioClient } = require('socket.io-client')
  const ioServer = new Server(server)
  const client = ioClient(`http://127.0.0.1:${port}`, { transports: ['websocket'] })
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket.io connect timeout')), 10000)
    client.on('connect', () => {
      clearTimeout(timer)
      resolve()
    })
  })
  client.close()
  await ioServer.close()
  server.close()

  restore()
  assert(
    captured.includes('express:application'),
    'express:application namespace routed through compat',
  )
  assert(captured.includes('router:layer'), 'router (express 5) namespace routed through compat')
  assert(/\bsend\b/.test(captured), 'send namespace routed through compat')
  assert(captured.includes('socket.io:'), 'socket.io namespaces routed through compat')
  console.log('alias fixture: express + send + socket.io all log through modern-debug/compat')
}

main().catch((err) => {
  restore()
  console.error('alias fixture FAILED:', err.message)
  console.error('--- captured stderr (first 2000 chars) ---')
  console.error(captured.slice(0, 2000))
  process.exit(1)
})

// §7/§9 0.8.0 gate: with `debug` overridden to modern-debug, real dependents must resolve
// OUR package and their diagnostics must flow through /compat. Exits non-zero on failure.
'use strict'
process.env.DEBUG = '*'
process.env.DEBUG_COLORS = 'false'

const assert = require('node:assert')
const http = require('node:http')

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
  // 1. the override resolves to us, and the factory is debug-shaped
  const debugPath = require.resolve('debug')
  assert(
    debugPath.replaceAll('\\', '/').includes('modern-debug'),
    `debug must resolve into modern-debug, got: ${debugPath}`,
  )
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

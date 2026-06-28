import { createServer } from 'http'
import app from './app'
import { env } from './config/env'
import { initSocket } from './config/socket'

const httpServer = createServer(app)
initSocket(httpServer)

httpServer.listen(env.port, () => {
  console.log(`MediOS API running on http://localhost:${env.port}`)
})

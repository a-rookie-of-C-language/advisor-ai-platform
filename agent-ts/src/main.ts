import { AgentApplicationFactory } from "./app/application/AgentApplicationFactory.js";

const server = new AgentApplicationFactory().createServer();

server.start();

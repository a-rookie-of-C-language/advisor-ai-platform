import { AgentApplicationFactory } from "./app/application/factory/AgentApplicationFactory.js";

const server = new AgentApplicationFactory().createServer();

server.start();

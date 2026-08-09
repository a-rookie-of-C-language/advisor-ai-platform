import { AgentApplicationFactory } from "./app/application/factory/application/AgentApplicationFactory.js";

const server = new AgentApplicationFactory().createServer();

server.start();

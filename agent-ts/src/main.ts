import { AgentApplicationFactory } from "./app/AgentApplicationFactory.js";

const server = new AgentApplicationFactory().createServer();

server.start();

import { AgentApplicationFactory } from "./AgentApplicationFactory.js";

const server = new AgentApplicationFactory().createServer();

server.start();

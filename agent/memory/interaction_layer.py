class InteractionLayer:
    def __init__(self):
        self.userMessages = []
        self.agentMessages = []
        self.systemMessages = []
        self.toolMessages = []
        self.otherMessages = []

    def addUserMessage(self, message: str) -> bool:
        self.userMessages.append(message)
        return True

    def addAgentMessage(self, message: str) -> bool:
        self.agentMessages.append(message)
        return True

    def addSystemMessage(self, message: str) -> bool:
        self.systemMessages.append(message)
        return True

    def addToolMessage(self, message: str) -> bool:
        self.toolMessages.append(message)
        return True

    def addOtherMessage(self, message: str) -> bool:
        self.otherMessages.append(message)
        return True
    
    def getUserMessages(self) -> list:
        return self.userMessages
    def getAgentMessages(self) -> list:
        return self.agentMessages
    def getSystemMessages(self) -> list:
        return self.systemMessages
    def getToolMessages(self) -> list:
        return self.toolMessages
    def getOtherMessages(self) -> list:
        return self.otherMessages

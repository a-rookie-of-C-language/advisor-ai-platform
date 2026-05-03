FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY . .
RUN mvn -pl chat-service -am clean install -DskipTests
RUN mvn -f chat-service/pom.xml package spring-boot:repackage -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /build/chat-service/target/*-SNAPSHOT.jar /app/app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "/app/app.jar"]



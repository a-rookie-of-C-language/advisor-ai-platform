FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /build
ARG SERVICE_NAME
COPY . .
RUN mvn -pl ${SERVICE_NAME} -am clean install -DskipTests
RUN mvn -f ${SERVICE_NAME}/pom.xml package spring-boot:repackage -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
ARG SERVICE_NAME
ARG SERVICE_PORT
COPY --from=builder /build/${SERVICE_NAME}/target/*-SNAPSHOT.jar /app/app.jar
EXPOSE ${SERVICE_PORT}
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

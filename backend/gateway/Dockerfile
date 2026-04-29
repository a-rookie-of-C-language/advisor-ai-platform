FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY . .
RUN mvn -pl gateway -am clean install -DskipTests
RUN mvn -f gateway/pom.xml package spring-boot:repackage -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /build/gateway/target/*-SNAPSHOT.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]



FROM maven:3.9.8-eclipse-temurin-17 AS builder
WORKDIR /build
COPY backend /build
RUN mvn -pl teacher-service -am clean install -DskipTests
RUN mvn -f teacher-service/pom.xml package spring-boot:repackage -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /build/teacher-service/target/*-SNAPSHOT.jar /app/app.jar
EXPOSE 8089
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY . .
RUN mvn -pl auth-service -am clean package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=builder /build/auth-service/target/*.jar /app/app.jar
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

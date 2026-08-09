FROM maven:3.9.9-eclipse-temurin-17 AS builder
WORKDIR /build
ARG SERVICE_NAME
ARG MAVEN_PROXY_HOST=""
ARG MAVEN_PROXY_PORT=""
COPY . .
RUN settings_args=""; \
    if [ -n "${MAVEN_PROXY_HOST}" ]; then \
      printf '%s\n' '<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"><proxies><proxy><id>build-proxy</id><active>true</active><protocol>http</protocol><host>'"${MAVEN_PROXY_HOST}"'</host><port>'"${MAVEN_PROXY_PORT}"'</port></proxy></proxies></settings>' > /tmp/maven-settings.xml; \
      settings_args="-s /tmp/maven-settings.xml"; \
    fi; \
    mvn $settings_args -pl ${SERVICE_NAME} -am clean install -DskipTests
RUN settings_args=""; \
    if [ -n "${MAVEN_PROXY_HOST}" ]; then settings_args="-s /tmp/maven-settings.xml"; fi; \
    mvn $settings_args -f ${SERVICE_NAME}/pom.xml package spring-boot:repackage -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
ARG SERVICE_NAME
ARG SERVICE_PORT
COPY --from=builder /build/${SERVICE_NAME}/target/*-SNAPSHOT.jar /app/app.jar
EXPOSE ${SERVICE_PORT}
ENTRYPOINT ["java", "-jar", "/app/app.jar"]

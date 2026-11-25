FROM eclipse-temurin:21-jdk AS build

WORKDIR /app
COPY gradlew build.gradle settings.gradle ./
COPY gradle ./gradle
COPY src ./src

RUN sed -i 's/\r$//' gradlew \
    && sh ./gradlew --no-daemon bootJar \
    && cp build/libs/*-SNAPSHOT.jar /app/application.jar

FROM eclipse-temurin:21-jre

WORKDIR /app
COPY --from=build /app/application.jar ./application.jar

EXPOSE 8090
ENTRYPOINT ["java", "-jar", "/app/application.jar"]
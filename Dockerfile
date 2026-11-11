FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Matjar.Server/Matjar.Server.csproj", "Matjar.Server/"]
RUN dotnet restore "Matjar.Server/Matjar.Server.csproj"

COPY . .
WORKDIR "/src/Matjar.Server"
RUN dotnet publish "Matjar.Server.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Matjar.Server.dll"]

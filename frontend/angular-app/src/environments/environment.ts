export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  microservices: {
    auth: 'http://localhost:8000',
    dataCollector: 'http://localhost:8001',
    monitorEngine: 'http://localhost:8002',
    notification: 'http://localhost:8003',
    backtest: 'http://localhost:8004'
  }
};
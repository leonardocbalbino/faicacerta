// Carregado antes do AppModule: scripts não usam Redis nem workers.
import 'dotenv/config';

process.env.QUEUE_DRIVER = 'inline';
process.env.LOG_LEVEL = 'error';

-- Separa "na fila do RabbitMQ" de "em processamento no n8n".
ALTER TABLE "Fatura" ADD COLUMN "processamentoIniciadoEm" TIMESTAMP(3);

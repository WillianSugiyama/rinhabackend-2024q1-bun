import { Value } from '@sinclair/typebox/value';
import { Elysia } from "elysia";
import { Pool } from "pg";
import { Clientes } from "./interfaces/clientes";
import { clientQuery } from "./queries/client";
import { createTransaction, transactions } from "./queries/transactions";
import { Param, ParamSchema, TransactionSchema } from "./validations";

const PORT = 8000;

const pool = new Pool({
  connectionString: process.env.DB_HOSTNAME ?? "postgres://admin:123@db:5432/rinha",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const app = new Elysia()
  .get("/clientes/:id/extrato", async ({ params: { id }, set }) => {
    const validate = Value.Check(ParamSchema, { id: +id } as Param);
    const parse = Value.Cast(ParamSchema, { id: +id } as Param);
    if (!validate) {
      set.status = 422;
      return { status: 422, body: 'Erro ao validar parametros.'};
    }

    const client = await pool.connect();
    try {
      const { rows } = await client.query(clientQuery(parse.id));
      if (!rows.length) {
        set.status = 404;
        return { status: 404, body: 'Cliente não encontrado' };
      }

      const transacoes = await client.query(transactions(parse.id));
      set.status = 200;
      return { ...transacoes.rows[0].json_build_object };
    } finally {
      client.release();
    }
  })
  .post('/clientes/:id/transacoes', async ({ body, params: { id }, set }) => {
    const validate = Value.Check(TransactionSchema, body);
    const castBody = Value.Cast(TransactionSchema, body);
    const validateParams = Value.Check(ParamSchema, { id: +id } as Param);
    const castParams = Value.Cast(ParamSchema, { id: +id } as Param);

    if (!validate|| !validateParams) {
      set.status = 422;
      return { status: 422, body: 'Erro ao validar parametros.' };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(`SELECT * FROM clientes WHERE id = $1 FOR UPDATE`, [castParams.id]);

      if (!rows.length) {
        await client.query('ROLLBACK');
        set.status = 404;
        return { status: 404, body: 'Cliente não encontrado' };
      }
      

      const cliente = rows[0] as Clientes;
      const valor = castBody.tipo === 'c' ? castBody.valor : -castBody.valor;
      const novoSaldo = cliente.saldo + valor;

      if (novoSaldo < -cliente.limite) {
        await client.query('ROLLBACK');
        set.status = 422;
        return { status: 422, body: 'Saldo insuficiente' };
      }

      await client.query(createTransaction(castParams.id, novoSaldo, castBody.valor, castBody.tipo, castBody.descricao));
      await client.query('COMMIT');

      set.status = 200;
      return { saldo: novoSaldo, limite: cliente.limite };
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      set.status = 500;
      return { status: 500, body: 'Erro ao realizar transação' };
    } finally {
      client.release();
    }
  })
  .listen(PORT);

console.log(`🦊 Elysia is running at ${app.server}.`);

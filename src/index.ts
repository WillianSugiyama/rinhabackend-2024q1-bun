import { Elysia } from "elysia";
import { Pool } from "pg";
import { Clientes } from "./interfaces/clientes";
import { client } from './queries/client';
import { createTransaction, transactions } from "./queries/transactions";
import { ParamSchema, TransactionSchema } from "./validations";

const PORT = 8000;

console.log('PROCESS.ENV', process.env);

const pool = new Pool({
  connectionString: "postgres://admin:123@db:5432/rinha",
})

pool.on('connect', () => {
  console.log('Connected to the database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const app = new Elysia()
  .get("/clientes/:id/extrato", async ({ params: { id }, set }) => {
    const validate = ParamSchema.safeParse({ id: +id });

    if (!validate.success) {
      set.status = 422;
      return {
        status: 422,
        body: validate.error
      }
    }

    try {
      const { rows } = await pool.query(client(validate.data.id));
  
      if(!rows.length) {
        set.status = 404;
        return {
          status: 404,
          body: 'Cliente não encontrado'
        }
      }
  
      const { rows: transacoes } = await pool.query(transactions(validate.data.id));
  
      set.status = 200;
      return {
        ...transacoes[0].json_build_object
      };
    } catch (e) {
      console.error(e);
      set.status = 500;
      return {
        status: 500,
        body: 'Erro ao buscar extrato'
      }
    }
  })
  .post('/clientes/:id/transacoes', async ({ request, params: { id }, set }) => {
    const validate = TransactionSchema.safeParse(await request.json());
    const validateParams = ParamSchema.safeParse({ id: +id });

    if (!validateParams.success) {
      set.status = 422;
      return {
        status: 422,
        body: validateParams.error
      }
    }

    if(!validate.success) {
      set.status = 422;
      return {
        status: 422,
        body: validate.error
      }
    }

    const isDebito = validate.data.tipo === 'd';

    try {
      const { rows } = await pool.query(client(validateParams.data.id));
  
      if(!rows.length) {
        set.status = 404;
        return {
          status: 404,
          body: 'Cliente não encontrado'
        }
      }
  
      const cliente = rows[0] as Clientes;
  
      if(isDebito && cliente.saldo - validate.data.valor < -cliente.limite) {
        set.status = 422;
        return {
          status: 422,
          body: 'Saldo insuficiente'
        }
      }
  
      const valor = validate.data.tipo === 'c' ? validate.data.valor : -validate.data.valor;
      const novoSaldo = cliente.saldo + valor;
  
      if(isDebito && isNaN(valor) || valor < -cliente.limite) {
        set.status = 422;
        return {
          status: 422,
          body: 'Saldo insuficiente'
        }
      }
  
      await pool.query(createTransaction(validateParams.data.id, novoSaldo, validate.data.tipo, validate.data.descricao));
  
      set.status = 200;
      return {
        saldo: novoSaldo,
        limite: cliente.limite
      };
    } catch (e) {
      console.error(e);
      set.status = 500;
      return {
        status: 500,
        body: 'Erro ao realizar transação'
      }
    }
  })
  .listen(PORT);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

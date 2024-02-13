import { Static, Type } from '@sinclair/typebox';

enum TIPOS {
  c = 'c',
  d = 'd'
}

export const TransactionSchema = Type.Object({
  valor: Type.Number(),
  tipo: Type.Enum(TIPOS),
  descricao: Type.String({
    maxLength: 10,
    minLength: 1
  })
});

export type Transaction = Static<typeof TransactionSchema>;

export const ParamSchema = Type.Object({
  id: Type.Integer({ minimum: 1 })
});

export type Param = Static<typeof ParamSchema>;
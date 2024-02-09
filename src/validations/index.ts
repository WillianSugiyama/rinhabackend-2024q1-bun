import { z } from 'zod';

const TIPOS = ['c', 'd'] as const;

export const TransactionSchema = z.object({
  valor: z.number().int(),
  tipo: z.enum(TIPOS),
  descricao: z.string().max(10)
});

export const ParamSchema = z.object({
  id: z.number().int()
});

export const transactions = (id: number) =>  `
WITH ultimas_transacoes AS (
  SELECT
      t.id_cliente,
      t.valor,
      t.tipo,
      t.descricao,
      t.realizada_em
  FROM
      transacoes t
  WHERE
      t.id_cliente = ${id}
  ORDER BY
      t.realizada_em DESC
  LIMIT 10
)
SELECT json_build_object(
  'saldo', json_build_object(
      'total', COALESCE(c.saldo, 0),
      'data_extrato', now(),
      'limite', c.limite
  ),
  'ultimas_transacoes', COALESCE(json_agg(
      json_build_object(
          'valor', ut.valor,
          'tipo', ut.tipo,
          'descricao', ut.descricao,
          'realizada_em', ut.realizada_em
      ) ORDER BY ut.realizada_em ASC
      ) FILTER (WHERE ut.valor IS NOT NULL), '[]'::json)
)
FROM
  clientes c
LEFT JOIN
  ultimas_transacoes ut ON c.id = ut.id_cliente
WHERE
  c.id = ${id}
GROUP BY
  c.id;
`;

export const createTransaction = (id: number, valor: number, tipo: string, descricao: string) => `
  INSERT INTO transacoes (id_cliente, valor, tipo, descricao) VALUES (${id}, ${valor}, '${tipo}', '${descricao}');
  UPDATE clientes SET saldo = ${valor} WHERE id = ${id};
`;

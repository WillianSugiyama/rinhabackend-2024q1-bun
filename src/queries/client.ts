export const clientQuery = (id: number) => `
  SELECT nome, limite, saldo FROM clientes WHERE id = ${id};
`;
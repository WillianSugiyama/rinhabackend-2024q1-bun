export const client = (id: number) => `
  SELECT nome, limite, saldo FROM clientes WHERE id = ${id};
`;
import { PrismaClient, TipoUsuario } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeder...');

  const senhaPadrao = await argon2.hash('123456');

  // Criar ADMIN
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@impulso.gov.br' },
    update: {},
    create: {
      email: 'admin@impulso.gov.br',
      senhaHash: senhaPadrao,
      tipoUsuario: TipoUsuario.ADMIN,
      nomeCompleto: 'Administrador do Sistema',
      cpfHash: '0000000000000000000000000000000000000000000000000000000000000000',
      cpfCriptografado: 'encrypted-cpf',
      telefone: '61999999999',
    },
  });

  console.log('👤 Admin criado:', admin.email);

  // Criar MENTOR
  const mentor = await prisma.usuario.upsert({
    where: { email: 'mentor@impulso.gov.br' },
    update: {},
    create: {
      email: 'mentor@impulso.gov.br',
      senhaHash: senhaPadrao,
      tipoUsuario: TipoUsuario.MENTOR,
      nomeCompleto: 'Mentor do Impulso',
      cpfHash: '1111111111111111111111111111111111111111111111111111111111111111',
      cpfCriptografado: 'encrypted-cpf',
      telefone: '61988888888',
    },
  });

  console.log('👤 Mentor criado:', mentor.email);

  // Criar JOVEM fictício
  const jovem = await prisma.usuario.upsert({
    where: { email: 'jovem@teste.com' },
    update: {},
    create: {
      email: 'jovem@teste.com',
      senhaHash: senhaPadrao,
      tipoUsuario: TipoUsuario.JOVEM,
      nomeCompleto: 'João Silva Jovem',
      cpfHash: '2222222222222222222222222222222222222222222222222222222222222222',
      cpfCriptografado: 'encrypted-cpf',
      telefone: '61977777777',
      perfilJovem: {
        create: {
          resumoProfissional: 'Jovem em busca de oportunidade',
        },
      },
    },
  });

  console.log('👤 Jovem criado:', jovem.email);

  // Criar EMPRESA fictícia
  const empresa = await prisma.usuario.upsert({
    where: { email: 'empresa@teste.com' },
    update: {},
    create: {
      email: 'empresa@teste.com',
      senhaHash: senhaPadrao,
      tipoUsuario: TipoUsuario.EMPRESA,
      nomeCompleto: 'Maria Diretora',
      cpfHash: '3333333333333333333333333333333333333333333333333333333333333333',
      cpfCriptografado: 'encrypted-cpf',
      telefone: '6133333333',
      perfilEmpresa: {
        create: {
          razaoSocial: 'Empresa Teste LTDA',
          nomeFantasia: 'Empresa Teste',
          cnpj: '11111111000111',
          parceiraDestaque: true,
        },
      },
    },
  });

  console.log('🏢 Empresa criada:', empresa.email);

  console.log('✅ Seeder finalizado com sucesso.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

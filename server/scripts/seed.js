const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createMasterUser() {
  try {
    console.log('🌱 Iniciando seed do banco de dados...');
    
    // Verificar se já existe a empresa
    const existingEmpresa = await prisma.empresa.findFirst({
      where: { slug: 'mdi-financas' }
    });
    
    if (existingEmpresa) {
      console.log('✅ Empresa master já existe!');
      return;
    }

    // Criar a empresa master
    const empresa = await prisma.empresa.create({
      data: {
        nome: 'MDI Finanças',
        slug: 'mdi-financas',
        plano: 'premium',
        ownerId: 'temp-owner-id'
      }
    });

    console.log('✅ Empresa criada:', empresa.nome);

    // Criar usuário administrador
    const adminUser = await prisma.usuario.create({
      data: {
        nome: 'Max Victor Guarinieri',
        email: 'maximussjrp@hotmail.com',
        senhaHash: await bcrypt.hash('123456', 10),
        role: 'admin',
        isActive: true,
        empresaId: empresa.id
      }
    });

    // Atualizar ownerId da empresa
    await prisma.empresa.update({
      where: { id: empresa.id },
      data: { ownerId: adminUser.id }
    });

    console.log('✅ Usuário master criado!');
    console.log('📋 Dados para login:');
    console.log('   Slug da Empresa: mdi-financas');
    console.log('   Email: maximussjrp@hotmail.com');
    console.log('   Senha: 123456');

  } catch (error) {
    console.error('❌ Erro ao criar usuário master:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMasterUser();

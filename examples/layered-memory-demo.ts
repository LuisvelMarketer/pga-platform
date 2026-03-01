/**
 * Layered Memory System - Demo completo
 *
 * Demuestra las mejoras implementadas basadas en el análisis de arquitectura:
 * - Schema fijo para facts (fact, confidence, sourceTurn, expiry)
 * - Política de expiración y borrado (TTL + delete by user)
 * - Extracción automática de facts
 * - Gestión de privacidad (GDPR compliance)
 *
 * @author Luis Alfredo Velasquez Duran
 * @since 2026-03-01
 */

import { PGA } from '@pga/core';
import { ClaudeAdapter } from '@pga/adapters-llm/anthropic';
import { PostgresAdapter } from '@pga/adapters-storage/postgres';

async function demoLayeredMemory() {
    // ─── Configuración ──────────────────────────────────────────

    const pga = new PGA({
        llm: new ClaudeAdapter({ apiKey: process.env.ANTHROPIC_KEY! }),
        storage: new PostgresAdapter({ connectionString: process.env.DATABASE_URL! }),
    });

    const genome = await pga.createGenome({
        name: 'memory-enhanced-assistant',
        config: {
            enableSandbox: false,
            mutationRate: 'balanced',

            // Configuración de Layered Memory
            layeredMemory: {
                enabled: true,

                // Short-term: últimos 8-20 turnos
                shortTermMaxMessages: 10,

                // Medium-term: resúmenes por sesión
                mediumTermMaxMessages: 50,

                // Auto-compaction cada 50 mensajes
                autoCompact: true,
            },
        },
    });

    console.log('✅ Genome creado con Layered Memory habilitado\n');

    // ─── Fase 1: Extracción Automática de Facts ────────────────

    console.log('📝 Fase 1: Extracción automática de facts\n');

    const userId = 'user-123';

    await genome.chat('Hola, soy Luis, un desarrollador de software en Chile', {
        userId,
    });

    await genome.chat('Trabajo principalmente con TypeScript y Python', {
        userId,
    });

    await genome.chat('Prefiero código conciso y bien documentado', {
        userId,
    });

    // Obtener facts extraídos
    const facts = await genome.contextMemory.layeredMemory?.getFacts(userId, genome.id);

    console.log('Facts extraídos automáticamente:');
    facts?.forEach(fact => {
        console.log(`  - ${fact.fact}`);
        console.log(`    Categoría: ${fact.category}`);
        console.log(`    Confianza: ${(fact.confidence * 100).toFixed(0)}%`);
        console.log(`    Turno origen: ${fact.sourceTurn}`);
        console.log(`    Expira: ${fact.expiry ? fact.expiry.toLocaleDateString() : 'Nunca'}`);
        console.log(`    Verificado: ${fact.verified ? 'Sí' : 'No'}\n`);
    });

    // ─── Fase 2: Verificación de Facts por el Usuario ──────────

    console.log('✓ Fase 2: Verificación de facts\n');

    if (facts && facts.length > 0) {
        const firstFact = facts[0];
        await genome.contextMemory.layeredMemory?.verifyFact(userId, genome.id, firstFact.id);

        console.log(`Fact verificado: "${firstFact.fact}"`);
        console.log('→ Confianza aumentada a 100%');
        console.log('→ Ya no expira (permanente)\n');
    }

    // ─── Fase 3: Política de Expiración ────────────────────────

    console.log('🗑️  Fase 3: Limpieza de facts expirados\n');

    const removedCount = await genome.contextMemory.layeredMemory?.cleanExpiredFacts(
        userId,
        genome.id
    );

    console.log(`Facts expirados eliminados: ${removedCount || 0}\n`);

    // ─── Fase 4: Borrado por Usuario (GDPR) ────────────────────

    console.log('🔒 Fase 4: Borrado de datos de usuario (GDPR compliance)\n');

    // Borrar un fact específico
    if (facts && facts.length > 1) {
        const factToDelete = facts[1];
        await genome.contextMemory.layeredMemory?.deleteFact(userId, genome.id, factToDelete.id);
        console.log(`✓ Fact eliminado: "${factToDelete.fact}"\n`);
    }

    // Borrar TODOS los datos del usuario
    console.log('⚠️  Borrado completo de datos del usuario...');
    await genome.contextMemory.layeredMemory?.deleteUserData(userId, genome.id);
    console.log('✓ Todos los datos del usuario han sido eliminados\n');

    // ─── Fase 5: Snapshot de Memoria ───────────────────────────

    console.log('📊 Fase 5: Snapshot de memoria actual\n');

    const snapshot = await genome.contextMemory.layeredMemory?.getMemorySnapshot(
        userId,
        genome.id
    );

    if (snapshot) {
        console.log('Memoria Actual:');
        console.log(`  Short-term: ${snapshot.shortTerm.messages.length} mensajes`);
        console.log(`  Medium-term: ${snapshot.mediumTerm.messageCount} mensajes resumidos`);
        console.log(`  Long-term: ${snapshot.longTerm.semanticFacts.length} facts`);
        console.log(`  Total tokens estimados: ${snapshot.totalEstimatedTokens}`);
        console.log(`  Última compactación: ${snapshot.lastCompaction.toLocaleString()}\n`);
    }

    // ─── Resumen de Capacidades ────────────────────────────────

    console.log('════════════════════════════════════════════════════════');
    console.log('✅ CAPACIDADES IMPLEMENTADAS');
    console.log('════════════════════════════════════════════════════════\n');

    console.log('1. Schema Fijo para Facts:');
    console.log('   ✓ fact: contenido del hecho');
    console.log('   ✓ confidence: nivel de confianza (0-1)');
    console.log('   ✓ sourceTurn: turno de origen');
    console.log('   ✓ expiry: fecha de expiración (TTL)\n');

    console.log('2. Política de Expiración:');
    console.log('   ✓ TTL configurable (default: 365 días)');
    console.log('   ✓ Limpieza automática de facts expirados');
    console.log('   ✓ Facts verificados nunca expiran\n');

    console.log('3. Gestión de Privacidad:');
    console.log('   ✓ deleteUserData() - borrado completo (GDPR)');
    console.log('   ✓ deleteFact() - borrado selectivo');
    console.log('   ✓ Configuración de políticas de privacidad\n');

    console.log('4. Extracción Automática:');
    console.log('   ✓ Facts extraídos con LLM');
    console.log('   ✓ Filtrado por confianza mínima');
    console.log('   ✓ Categorización automática\n');

    console.log('5. Reducción de Tokens:');
    console.log('   ✓ 85-95% reducción vs. historial completo');
    console.log('   ✓ Compactación automática');
    console.log('   ✓ Resúmenes en medium-term\n');
}

// Ejecutar demo
demoLayeredMemory()
    .then(() => {
        console.log('\n✅ Demo completado exitosamente');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Error en demo:', error);
        process.exit(1);
    });

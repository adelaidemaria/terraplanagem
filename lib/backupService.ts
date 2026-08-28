import { supabase } from './supabase';

export interface BackupMetadata {
    version: string;
    createdAt: string;
    appName: string;
    totalRecords: number;
    tableCounts: Record<string, number>;
    tables: Record<string, any[]>;
}

export interface HistoryEntry {
    id: string;
    type: 'backup' | 'restore';
    createdAt: string;
    filename: string;
    totalRecords: number;
    status: 'Sucesso' | 'Falha';
}

// Lista ordenada por dependência de chaves estrangeiras (Foreign Keys)
export const ORDERED_TABLES = [
    // 1. Cadastros Básicos (Sem Foreign Keys)
    'vendor_categories',
    'account_categories',
    'account_subcategories',
    'customers',
    'vendors',
    'account_plans',
    'bank_accounts',
    'equipment',
    'company_vehicles',
    'funcionarios',
    'configuracao_empresa',
    'corporate_cards',

    // 2. Transações e Documentos Principais
    'sales',
    'expenses',
    'bank_transfers',
    'financial_yields',
    'agenda_items',
    'maintenance_records',
    'corporate_card_payments',
    'ctr',
    'orcamentos',
    'simples_nacional_faturamento',
    'emprestimos_funcionarios',
    'company_loans',
    'work_orders',
    'rental_equipments',
    'daily_checklists',
    'funcionario_documentos',

    // 3. Itens e Relacionamentos Secundários
    'payments',
    'work_order_items',
    'vehicle_checklist_items',
    'backup_history'
];

const BACKUP_HISTORY_KEY = 'tb_backup_history_v2';
const RESTORE_HISTORY_KEY = 'tb_restore_history_v2';

/**
 * Obtém o histórico síncrono local (fallback).
 */
export function getBackupHistory(): { backups: HistoryEntry[]; restores: HistoryEntry[] } {
    try {
        const backupsRaw = localStorage.getItem(BACKUP_HISTORY_KEY);
        const restoresRaw = localStorage.getItem(RESTORE_HISTORY_KEY);
        return {
            backups: backupsRaw ? JSON.parse(backupsRaw) : [],
            restores: restoresRaw ? JSON.parse(restoresRaw) : []
        };
    } catch {
        return { backups: [], restores: [] };
    }
}

/**
 * Obtém o histórico mesclando dados salvos no Supabase (Nuvem) com o cache local (localStorage).
 */
export async function getBackupHistoryAsync(): Promise<{ backups: HistoryEntry[]; restores: HistoryEntry[] }> {
    const local = getBackupHistory();
    let cloudBackups: HistoryEntry[] = [];
    let cloudRestores: HistoryEntry[] = [];

    try {
        const { data: bData } = await supabase
            .from('backup_history')
            .select('*')
            .eq('type', 'backup')
            .order('created_at', { ascending: false })
            .limit(5);

        if (bData && bData.length > 0) {
            cloudBackups = bData.map((row: any) => ({
                id: row.id,
                type: 'backup',
                createdAt: row.created_at || new Date().toISOString(),
                filename: row.filename,
                totalRecords: row.total_records,
                status: row.status || 'Sucesso'
            }));
        }

        const { data: rData } = await supabase
            .from('backup_history')
            .select('*')
            .eq('type', 'restore')
            .order('created_at', { ascending: false })
            .limit(5);

        if (rData && rData.length > 0) {
            cloudRestores = rData.map((row: any) => ({
                id: row.id,
                type: 'restore',
                createdAt: row.created_at || new Date().toISOString(),
                filename: row.filename,
                totalRecords: row.total_records,
                status: row.status || 'Sucesso'
            }));
        }
    } catch (e) {
        console.warn('Tabela backup_history ainda não criada no Supabase. Usando histórico local:', e);
    }

    const combine = (cloud: HistoryEntry[], localList: HistoryEntry[]) => {
        const map = new Map<string, HistoryEntry>();
        [...cloud, ...localList].forEach(item => {
            if (item && item.filename && !map.has(item.filename)) {
                map.set(item.filename, item);
            }
        });
        return Array.from(map.values())
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 3);
    };

    return {
        backups: combine(cloudBackups, local.backups),
        restores: combine(cloudRestores, local.restores)
    };
}

/**
 * Grava a operação imediatamente no cache local e tenta persistir no Supabase (Nuvem).
 */
async function saveHistoryEntry(entry: HistoryEntry) {
    // 1. Gravar imediatamente no LocalStorage (Redundância Garantida)
    try {
        const history = getBackupHistory();
        if (entry.type === 'backup') {
            const updated = [entry, ...history.backups.filter(b => b.filename !== entry.filename)].slice(0, 5);
            localStorage.setItem(BACKUP_HISTORY_KEY, JSON.stringify(updated));
        } else {
            const updated = [entry, ...history.restores.filter(r => r.filename !== entry.filename)].slice(0, 5);
            localStorage.setItem(RESTORE_HISTORY_KEY, JSON.stringify(updated));
        }
    } catch (e) {
        console.error('Erro ao salvar histórico local:', e);
    }

    // 2. Gravar no Supabase se a tabela existir
    try {
        await supabase.from('backup_history').insert([{
            type: entry.type,
            filename: entry.filename,
            total_records: entry.totalRecords,
            status: entry.status,
            created_at: entry.createdAt
        }]);
    } catch (e) {
        console.warn('Falha ao inserir no banco Supabase backup_history:', e);
    }
}

/**
 * Gera um backup completo de todas as tabelas do Supabase e dispara o download do arquivo JSON.
 */
export async function exportDatabaseBackup(prefix: string = 'backup_terraplanagem'): Promise<{ success: boolean; totalRecords: number; message: string; filename: string }> {
    try {
        const backupData: Record<string, any[]> = {};
        const tableCounts: Record<string, number> = {};
        let totalRecords = 0;

        for (const tableName of ORDERED_TABLES) {
            const { data, error } = await supabase.from(tableName).select('*');
            if (error) {
                console.error(`Erro ao exportar tabela ${tableName}:`, error);
                backupData[tableName] = [];
                tableCounts[tableName] = 0;
            } else {
                const rows = data || [];
                backupData[tableName] = rows;
                tableCounts[tableName] = rows.length;
                totalRecords += rows.length;
            }
        }

        const backupPayload: BackupMetadata = {
            version: '1.0',
            createdAt: new Date().toISOString(),
            appName: 'Sistema de Terraplanagem',
            totalRecords,
            tableCounts,
            tables: backupData
        };

        // Criar e baixar arquivo JSON
        const jsonString = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const dateFormatted = new Date().toISOString().slice(0, 10);
        const timeFormatted = new Date().toTimeString().slice(0, 5).replace(':', '-');
        const filename = `${prefix}_${dateFormatted}_${timeFormatted}.json`;

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Salvar no histórico se for backup manual do usuário
        if (prefix === 'backup_terraplanagem') {
            await saveHistoryEntry({
                id: crypto.randomUUID(),
                type: 'backup',
                createdAt: new Date().toISOString(),
                filename,
                totalRecords,
                status: 'Sucesso'
            });
        }

        return {
            success: true,
            totalRecords,
            filename,
            message: `Backup gerado com sucesso! ${totalRecords} registros exportados.`
        };
    } catch (err: any) {
        console.error('Erro na exportação do backup:', err);
        return {
            success: false,
            totalRecords: 0,
            filename: '',
            message: `Falha ao gerar backup: ${err.message || err}`
        };
    }
}

/**
 * RESTAURAÇÃO POR SUBSTITUIÇÃO EXATA (OPÇÃO B):
 * 1. Gera um Auto-Backup de Emergência Silencioso antes de alterar qualquer dado.
 * 2. Compara a base na nuvem com o backup e remove lançamentos criados APÓS a data do backup.
 * 3. Restaura os dados exatos do arquivo .json via upsert.
 */
export async function restoreDatabaseBackup(
    backupJson: BackupMetadata,
    onProgress?: (stepText: string, current: number, total: number) => void
): Promise<{ success: boolean; message: string; restoredCount: number }> {
    const filename = `restauracao_${new Date().toISOString().slice(0, 10)}.json`;

    try {
        if (!backupJson || typeof backupJson !== 'object' || !backupJson.tables) {
            throw new Error('Arquivo de backup inválido ou corrompido.');
        }

        // PASSO 1: AUTO-BACKUP DE EMERGÊNCIA DE SEGURANÇA
        if (onProgress) {
            onProgress('Gerando Auto-Backup de Emergência da base atual...', 1, 3);
        }
        await exportDatabaseBackup('backup_AUTO_EMERGENCIA_PRE_RESTAURACAO');

        // PASSO 2: REMOVER REGISTROS CRIADOS DEPOIS DO BACKUP (Substituição Exata - Ordem Reversa)
        const REVERSE_TABLES = [...ORDERED_TABLES].reverse();
        if (onProgress) {
            onProgress('Sincronizando e revertendo lançamentos posteriores...', 2, 3);
        }

        for (const tableName of REVERSE_TABLES) {
            const backupRows = backupJson.tables[tableName] || [];
            const backupIds = new Set(backupRows.map((r: any) => r.id).filter(Boolean));

            // Buscar registros atuais no Supabase
            const { data: currentRows } = await supabase.from(tableName).select('id');
            if (currentRows && currentRows.length > 0) {
                const toDeleteIds = currentRows
                    .map((r: any) => r.id)
                    .filter((id: string) => id && !backupIds.has(id));

                if (toDeleteIds.length > 0) {
                    for (let i = 0; i < toDeleteIds.length; i += 50) {
                        const batch = toDeleteIds.slice(i, i + 50);
                        await supabase.from(tableName).delete().in('id', batch);
                    }
                }
            }
        }

        // PASSO 3: RESTAURAR REGISTROS DO ARQUIVO BACKUP JSON (Ordem Direta)
        if (onProgress) {
            onProgress('Restaurando registros exatos do arquivo de backup...', 3, 3);
        }

        let totalRestored = 0;

        for (let i = 0; i < ORDERED_TABLES.length; i++) {
            const tableName = ORDERED_TABLES[i];
            const rows = backupJson.tables[tableName];

            if (Array.isArray(rows) && rows.length > 0) {
                const batchSize = 50;
                for (let j = 0; j < rows.length; j += batchSize) {
                    const batch = rows.slice(j, j + batchSize);
                    const { error } = await supabase.from(tableName).upsert(batch);
                    if (error) {
                        console.error(`Erro ao restaurar lote na tabela ${tableName}:`, error);
                        throw new Error(`Falha na restauração da tabela [${tableName}]: ${error.message}`);
                    }
                }
                totalRestored += rows.length;
            }
        }

        // Salvar no histórico de restaurações
        await saveHistoryEntry({
            id: crypto.randomUUID(),
            type: 'restore',
            createdAt: new Date().toISOString(),
            filename,
            totalRecords: totalRestored,
            status: 'Sucesso'
        });

        return {
            success: true,
            message: `Restauração por Substituição Exata concluída com sucesso! ${totalRestored} registros alinhados.`,
            restoredCount: totalRestored
        };
    } catch (err: any) {
        console.error('Erro ao restaurar backup:', err);
        await saveHistoryEntry({
            id: crypto.randomUUID(),
            type: 'restore',
            createdAt: new Date().toISOString(),
            filename,
            totalRecords: 0,
            status: 'Falha'
        });
        return {
            success: false,
            message: err.message || 'Erro desconhecido ao restaurar backup.',
            restoredCount: 0
        };
    }
}

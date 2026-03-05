import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

// Utility to convert snake_case to camelCase
const toCamel = (str: string) => str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
const toSnake = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

const keysToCamel = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => keysToCamel(v));
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            // Specifically skip 'intervals' and 'items' if they contain arbitrary JSON that shouldn't matter as much, but actually it's fine.
            result[toCamel(key)] = keysToCamel(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
};

const keysToSnake = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(v => keysToSnake(v));
    if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((result, key) => {
            result[toSnake(key)] = keysToSnake(obj[key]);
            return result;
        }, {} as any);
    }
    return obj;
};

export function useSupabaseSync<T extends { id: string }>(tableName: string, initialData?: T[]) {
    const [data, setData] = useState<T[]>(initialData || []);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const { data: fetchedData, error } = await supabase.from(tableName).select('*');
            if (!error && fetchedData) {
                setData(keysToCamel(fetchedData) as T[]);
            }
            setLoaded(true);
        };

        // Fetch inicial
        fetchData();

        // Se o usuário logar depois que a página iniciou, refazer o fetch da tabela!
        const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') {
                fetchData();
            } else if (event === 'SIGNED_OUT') {
                setData([]);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [tableName]);

    const setSyncedData = (action: React.SetStateAction<T[]>) => {
        setData((prev) => {
            const newData = typeof action === 'function' ? (action as any)(prev) : action;

            const prevIds = new Set(prev.map(item => item.id));
            const newIds = new Set(newData.map((item: T) => item.id));

            const deletedIds = prev.filter(item => !newIds.has(item.id)).map(item => item.id);
            const addedOrUpdated = newData.filter((item: T) => {
                const old = prev.find(p => p.id === item.id);
                return !old || JSON.stringify(old) !== JSON.stringify(item);
            });

            if (deletedIds.length > 0) {
                supabase.from(tableName).delete().in('id', deletedIds).then(({ error }) => {
                    if (error) {
                        console.error(`Error deleting from ${tableName}:`, error);
                        alert(`Erro ao excluir do banco de dados (${tableName}):\n${error.message}`);
                    }
                });
            }
            if (addedOrUpdated.length > 0) {
                const snakeCaseData = keysToSnake(addedOrUpdated);
                console.log(`Syncing ${addedOrUpdated.length} items to ${tableName}...`, snakeCaseData);
                supabase.from(tableName).upsert(snakeCaseData).then(({ error, data }) => {
                    if (error) {
                        console.error(`Error upserting to ${tableName}:`, error);
                        alert(`ERRO CRÍTICO NO BANCO DE DADOS (${tableName}):\n\n${error.message}\n\nDetalhes: ${error.details}\nCódigo: ${error.code}`);
                    } else {
                        console.log(`Successfully synced ${tableName}`);
                    }
                });
            }

            return newData;
        });
    };

    return [data, setSyncedData, loaded] as const;
}

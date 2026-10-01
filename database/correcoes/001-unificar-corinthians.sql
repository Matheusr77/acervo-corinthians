-- ============================================================
-- Correção 001 — Unificar o registro duplicado do Corinthians
--
-- Problema: o scraping criou um segundo time "Corinthians" (id_time 1014,
-- cidade "Porto Alegre") e ligou a ele todos os jogos a partir de 14/12/1947.
-- O registro correto é o id_time 1 (São Paulo).
--
-- Esta correção move os jogos do 1014 para o 1 e apaga o 1014.
-- Não cria tabelas. Faça um backup antes (mysqldump) por segurança.
--
-- Como rodar:
--   mysql -u root -p corinthians_db < database/correcoes/001-unificar-corinthians.sql
-- Depois, no .env, pode usar: CORINTHIANS_IDS=1
-- ============================================================

-- 1) Conferência: deve mostrar os dois registros (1 e 1014) antes da correção
SELECT id_time, nome, cidade, estado FROM time WHERE id_time IN (1, 1014);

START TRANSACTION;

-- 2) Move os jogos (o JOIN garante que só age se o 1014 for mesmo "Corinthians")
UPDATE jogo j
    INNER JOIN time t ON t.id_time = j.id_mandante
SET j.id_mandante = 1
WHERE t.id_time = 1014 AND t.nome = 'Corinthians';

UPDATE jogo j
    INNER JOIN time t ON t.id_time = j.id_visitante
SET j.id_visitante = 1
WHERE t.id_time = 1014 AND t.nome = 'Corinthians';

-- 3) Remove o registro duplicado (só se não sobrou nenhum jogo ligado a ele)
DELETE FROM time
WHERE id_time = 1014
  AND nome = 'Corinthians'
  AND NOT EXISTS (SELECT 1 FROM jogo WHERE 1014 IN (id_mandante, id_visitante));

COMMIT;

-- 4) Verificação: jogos_do_clube deve ser igual a total_de_jogos
SELECT
    (SELECT COUNT(*) FROM jogo WHERE 1 IN (id_mandante, id_visitante)) AS jogos_do_clube,
    (SELECT COUNT(*) FROM jogo)                                        AS total_de_jogos;

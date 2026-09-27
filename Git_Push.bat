@echo off
:: Navega até o diretório do projeto na sua Área de Trabalho
cd /d "%~dp0"

:: Lógica para capturar data e hora formatadas
set hour=%TIME:~0,2%
:: Ajusta o espaço vazio se a hora for menor que 10 (ex: " 9" vira "09")
if "%hour:~0,1%" == " " set hour=0%hour:~1,1%
set timestamp=%DATE:~0,2%/%DATE:~3,2%/%DATE:~6,4%-%hour%:%TIME:~3,2%

echo Iniciando push do Anime View para o GitHub...
echo Comentario: %timestamp%

:: Comandos Git
git add .
git commit -m "%timestamp%"
git push

echo.
echo Atualizacao concluida com sucesso!
pause

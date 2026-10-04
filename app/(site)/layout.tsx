import Pagina from "@/components/Pagina";

/**
 * Layout comum das abas (/, /stats, /stats/retrospectiva, /temporada): carrega a planilha e monta o App.
 * Como fica no layout, trocar de aba não recarrega nada — só muda o endereço.
 * Página pronta, renovada em segundo plano no máximo a cada 60 s (ninguém espera a planilha); se a
 * renovação falhar, continua no ar a última que funcionou.
 */
export const revalidate = 60;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <Pagina>{children}</Pagina>;
}

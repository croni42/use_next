// EVAL-SEED E01
export default function RawResult({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

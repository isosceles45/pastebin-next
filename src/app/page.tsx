import PasteForm from "@/components/PasteForm";
import WordMark from "@/components/WordMark";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="font-display text-4xl">
        <WordMark />
      </h1>
      <p className="mt-2 mb-8 text-muted">
        Store text, share the link. Set it to expire after a while, after a few reads, or
        leave it be.
      </p>
      <PasteForm />
    </main>
  );
}

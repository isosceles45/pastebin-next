import PasteForm from "@/components/PasteForm";
import WordMark from "@/components/WordMark";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl">
        <WordMark />
      </h1>
      <p className="mt-2 mb-8 max-w-xl text-sm text-muted sm:text-base">
        Store text, share the link. Set it to expire after a while, after a few
        reads, or leave it be.
      </p>
      <PasteForm />
    </main>
  );
}

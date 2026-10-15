
"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import SiteHeader from "../components/SiteHeader";
import { createClient } from "../../lib/supabase";

type ImageStatus = "empty" | "loading" | "loaded" | "error";

export default function SubmitGamePage() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState("");
  const [error, setError] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageStatus, setImageStatus] = useState<ImageStatus>("empty");
  const [submitting, setSubmitting] = useState(false);
  const [priceMode, setPriceMode] = useState<"free" | "paid">("free");

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const url = event.target.value.trim();
    setImageUrl(url);
    setError("");
    setImageStatus(url ? "loading" : "empty");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitting) return;

    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submittedImageUrl = String(
      formData.get("imageUrl") ?? ""
    ).trim();

    const rawPrice = String(formData.get("price") ?? "").trim();

    if (submittedImageUrl && imageStatus !== "loaded") {
      setError(
        imageStatus === "error"
          ? "Your thumbnail could not be loaded. Check the URL or use another image."
          : "Please wait for your thumbnail preview to load."
      );
      return;
    }

    let savedPrice = "0.00";

    if (priceMode === "paid") {
      if (!/^\d+(\.\d{1,2})?$/.test(rawPrice)) {
        setError(
          "Enter a valid price with no more than two decimal places."
        );
        return;
      }

      const numericPrice = Number(rawPrice);

      if (
        !Number.isFinite(numericPrice) ||
        numericPrice < 0.01 ||
        numericPrice > 99999.99
      ) {
        setError(
          "Enter a price between £0.01 and £99,999.99."
        );
        return;
      }

      savedPrice = numericPrice.toFixed(2);
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/login?next=/submit";
        return;
      }

      const title = String(
        formData.get("title") ?? ""
      ).trim();

      const { error: insertError } = await supabase
        .from("game_submissions")
        .insert({
          developer_id: user.id,
          title,
          developer_name: String(
            formData.get("developer") ?? ""
          ).trim(),
          genre: String(formData.get("genre") ?? ""),
          description: String(
            formData.get("description") ?? ""
          ).trim(),
          game_link: String(
            formData.get("gameLink") ?? ""
          ).trim(),
          image_url: submittedImageUrl || null,
          price: savedPrice,
          ai_type: String(formData.get("aiType") ?? ""),
          ai_areas: formData.getAll("aiAreas").map(String),
          ai_explanation: String(
            formData.get("aiExplanation") ?? ""
          ).trim(),
          evidence_link: String(
            formData.get("evidenceLink") ?? ""
          ).trim(),
          status: "Pending Review",
        });

      if (insertError) {
        console.error(insertError);
        setError(
          "Could not save your submission. Please try again."
        );
        return;
      }

      setSubmittedTitle(title);
      setSubmitted(true);
      setImageUrl("");
      setImageStatus("empty");
      setPriceMode("free");
      form.reset();
    } catch (err) {
      console.error(err);
      setError(
        "An unexpected error occurred. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-2 w-full rounded-lg border border-white/10 bg-[#101311] px-4 py-3 outline-none focus:border-[#77f29b]";

  const labelClass = "block text-sm text-zinc-300";

  return (
    <main className="min-h-screen bg-[#090b0a] text-zinc-100">
      <SiteHeader />

      <section className="border-b border-white/[0.08] bg-gradient-to-br from-[#14251b] via-[#0c100d] to-[#090b0a]">
        <div className="mx-auto max-w-4xl px-6 py-16">
          <p className="text-sm font-semibold tracking-widest text-[#77f29b]">
            DEVELOPERS
          </p>

          <h1 className="mt-4 text-4xl font-bold md:text-5xl">
            Submit your game.
          </h1>

          <p className="mt-5 max-w-2xl leading-7 text-zinc-400">
            Introduce your game to players who care about what
            they play, how it was made, and whether it is worth
            their time.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-12">
        {submitted ? (
          <div className="rounded-xl border border-[#77f29b]/30 bg-[#101311] p-8">
            <h2 className="text-2xl font-bold text-[#77f29b]">
              Submission saved
            </h2>

            <p className="mt-4 leading-7 text-zinc-300">
              Your application for {submittedTitle} has been
              saved to Playtested and is awaiting review.
            </p>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Your submission has not yet been independently
              verified or approved.
            </p>

            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="mt-6 rounded-md border border-white/15 px-5 py-3 text-sm hover:border-[#77f29b]/50"
            >
              Submit another game
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-10">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">
                  1. Game details
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Tell players what you have built.
                </p>
              </div>

              <label className={labelClass}>
                Game title *
                <input
                  required
                  name="title"
                  placeholder="Enter your game title"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Developer or studio *
                <input
                  required
                  name="developer"
                  placeholder="Studio name"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Genre *
                <select
                  required
                  name="genre"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a genre
                  </option>
                  <option>Action</option>
                  <option>Action RPG</option>
                  <option>Adventure</option>
                  <option>Casual</option>
                  <option>Horror</option>
                  <option>Platformer</option>
                  <option>Simulation</option>
                  <option>Strategy</option>
                  <option>Survival</option>
                  <option>Other</option>
                </select>
              </label>

              <label className={labelClass}>
                Game description *
                <textarea
                  required
                  name="description"
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe the gameplay, key features and what makes your game different."
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Store or gameplay link
                <input
                  name="gameLink"
                  type="url"
                  placeholder="https://..."
                  className={inputClass}
                />
              </label>

              <div>
                <label htmlFor="imageUrl" className={labelClass}>
                  Game thumbnail image URL
                  <input
                    id="imageUrl"
                    name="imageUrl"
                    type="url"
                    value={imageUrl}
                    onChange={handleImageChange}
                    placeholder="https://example.com/game-cover.jpg"
                    className={inputClass}
                  />
                </label>

                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Paste a direct link to your game's image.
                </p>

                {imageUrl && (
                  <div className="mt-4 rounded-xl border border-white/10 bg-[#101311] p-4">
                    <p className="mb-3 text-sm font-semibold text-zinc-300">
                      Thumbnail preview
                    </p>

                    {imageStatus === "loading" && (
                      <p className="text-sm text-amber-300">
                        Checking image...
                      </p>
                    )}

                    {imageStatus === "error" && (
                      <p className="text-sm text-red-300">
                        Image failed to load. Check the URL.
                      </p>
                    )}

                    <img
                      key={imageUrl}
                      src={imageUrl}
                      alt="Game thumbnail preview"
                      className={`max-h-72 w-full rounded-lg object-contain ${
                        imageStatus === "error" ? "hidden" : ""
                      }`}
                      onLoad={() => setImageStatus("loaded")}
                      onError={() => setImageStatus("error")}
                    />

                    {imageStatus === "loaded" && (
                      <p className="mt-3 text-sm text-[#77f29b]">
                        Image loaded successfully.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className={labelClass}>
                  How will you sell your game? *
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPriceMode("free")}
                    aria-pressed={priceMode === "free"}
                    className={`rounded-lg border p-4 text-left transition ${
                      priceMode === "free"
                        ? "border-[#77f29b] bg-[#77f29b]/10"
                        : "border-white/10 bg-[#101311] hover:border-white/25"
                    }`}
                  >
                    <span className="block font-semibold">
                      Free
                    </span>
                    <span className="mt-1 block text-sm text-zinc-400">
                      Players can access it for free.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPriceMode("paid")}
                    aria-pressed={priceMode === "paid"}
                    className={`rounded-lg border p-4 text-left transition ${
                      priceMode === "paid"
                        ? "border-[#77f29b] bg-[#77f29b]/10"
                        : "border-white/10 bg-[#101311] hover:border-white/25"
                    }`}
                  >
                    <span className="block font-semibold">
                      Paid
                    </span>
                    <span className="mt-1 block text-sm text-zinc-400">
                      Set a price in pounds.
                    </span>
                  </button>
                </div>

                {priceMode === "paid" && (
                  <label className={`${labelClass} mt-5`}>
                    Selling price (GBP) *
                    <div className="mt-2 flex items-center rounded-lg border border-white/10 bg-[#101311] focus-within:border-[#77f29b]">
                      <span className="pl-4 text-zinc-400">
                        £
                      </span>
                      <input
                        required
                        name="price"
                        type="number"
                        min="0.01"
                        max="99999.99"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="9.99"
                        className="w-full bg-transparent px-3 py-3 outline-none"
                      />
                    </div>
                    <span className="mt-2 block text-xs text-zinc-500">
                      Choose a price between £0.01 and £99,999.99.
                    </span>
                  </label>
                )}
              </div>
            </section>

            <div className="border-t border-white/10" />

            <section className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">
                  2. AI disclosure
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Disclose how AI was used. This is separate
                  from independent verification.
                </p>
              </div>

              <label className={labelClass}>
                Overall AI involvement *
                <select
                  required
                  name="aiType"
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select a classification
                  </option>
                  <option value="AI-generated">
                    AI-generated content or code
                  </option>
                  <option value="AI-assisted">
                    AI-assisted development
                  </option>
                  <option value="No AI disclosed">
                    No AI use to disclose
                  </option>
                </select>
              </label>

              <fieldset>
                <legend className="mb-3 text-sm text-zinc-300">
                  Which areas involved AI?
                </legend>

                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    "Programming or code",
                    "Artwork or textures",
                    "Writing or dialogue",
                    "Voice or audio",
                    "Music or sound effects",
                    "Animation or video",
                    "Testing or development tools",
                    "Other",
                  ].map((area) => (
                    <label
                      key={area}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#101311] p-3 text-sm text-zinc-300"
                    >
                      <input
                        type="checkbox"
                        name="aiAreas"
                        value={area}
                        className="accent-[#77f29b]"
                      />
                      {area}
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className={labelClass}>
                Explain how AI was used
                <textarea
                  name="aiExplanation"
                  rows={5}
                  maxLength={2000}
                  placeholder="Which tools were used, what did they produce, and how much was edited or created by humans?"
                  className={inputClass}
                />
              </label>

              <label className={labelClass}>
                Supporting evidence or documentation link
                <input
                  name="evidenceLink"
                  type="url"
                  placeholder="https://..."
                  className={inputClass}
                />
                <span className="mt-2 block text-xs leading-5 text-zinc-500">
                  Evidence might include tool disclosures, production
                  notes or asset records.
                </span>
              </label>
            </section>

            <div className="rounded-xl border border-amber-300/20 bg-amber-300/[0.04] p-5">
              <h3 className="font-semibold text-amber-200">
                What happens next?
              </h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Submissions start as Pending Review. Submitting
                a game does not automatically make it verified.
                Store purchasing is not yet enabled.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#77f29b] px-6 py-4 font-bold text-[#090b0a] transition hover:bg-[#91ffb0] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? "Submitting..." : "Submit application"}
            </button>

            <p className="text-xs text-zinc-600">
              Submissions are stored in the Playtested database.
            </p>
          </form>
        )}
      </section>

      <footer className="border-t border-white/[0.08] px-6 py-6 text-center text-xs text-zinc-600">
        PLAYTESTED_ · Prototype
      </footer>
    </main>
  );
}
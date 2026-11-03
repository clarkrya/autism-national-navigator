
import Card from "../ui/Card";
import Container from "../ui/Container";
import Heading from "../ui/Heading";
import Section from "../ui/Section";

/*
 * ============================================================
 * AUTIVOYA — WHY CHOOSE US
 * ============================================================
 *
 * Highlights the value of Autivoya for families.
 *
 * Preserves existing reusable UI components,
 * card structure, and responsive grid.
 * ============================================================
 */

const reasons = [
  {
    title: "Personalized to Your Family",
    description:
      "Every family's journey is different. Autivoya helps tailor your roadmap around your child's age, journey stage, location, and your family's priorities.",
  },
  {
    title: "Trusted Guidance and Resources",
    description:
      "Find organized information from healthcare organizations, state programs, and autism resources to help you explore available support and make informed decisions.",
  },
  {
    title: "Clarity on What Comes Next",
    description:
      "Instead of navigating endless information on your own, Autivoya helps you identify meaningful next steps and move forward at a pace that works for your family.",
  },
  {
    title: "Designed With Families in Mind",
    description:
      "Autivoya brings guidance, resources, and your family's journey together in one place, making it easier to stay organized and navigate the road ahead.",
  },
];

export default function WhyChooseUs() {
  return (
    <Section>
      <Container>
        <Heading
          title="Why Families Choose Autivoya"
          subtitle="Every journey is unique. Every step matters. Discover a more personalized and supportive way to navigate your family's autism journey."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            gap: "24px",
            marginTop: "40px",
          }}
        >
          {reasons.map((reason) => (
            <Card
              key={reason.title}
              title={reason.title}
              subtitle={reason.description}
            >
              <div />
            </Card>
          ))}
        </div>
      </Container>
    </Section>
  );
}

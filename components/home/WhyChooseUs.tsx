import Card from "../ui/Card";
import Container from "../ui/Container";
import Heading from "../ui/Heading";
import Section from "../ui/Section";

const reasons = [
  {
    title: "Personalized Guidance",
    description:
      "Every family receives recommendations based on their child's age, journey stage, location, and priorities.",
  },
  {
    title: "Trusted Resources",
    description:
      "We organize reliable information from healthcare organizations, state programs, and autism experts.",
  },
  {
    title: "One Step at a Time",
    description:
      "Instead of overwhelming families with hundreds of resources, we focus on the next best action.",
  },
  {
    title: "Designed for Families",
    description:
      "Built with empathy to reduce stress and provide confidence throughout the autism journey.",
  },
];

export default function WhyChooseUs() {
  return (
    <Section spacing="large">
      <Container size="large">
        <Heading
          title="Why Families Choose Autism Journey Navigator"
          subtitle="Designed to provide clarity, confidence, and practical guidance every step of the way."
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
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
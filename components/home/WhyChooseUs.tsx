import Card from "../ui/Card";
import Container from "../ui/Container";
import Heading from "../ui/Heading";
import Section from "../ui/Section";


const reasons = [
  {
    title: "Personalized to Your Family",
    description:
      "Your roadmap considers your child's age, journey stage, location, and family's priorities.",
  },
  {
    title: "Trusted Information",
    description:
      "We organize reliable information from healthcare organizations, state programs, and autism resources.",
  },
  {
    title: "Focused on What Comes Next",
    description:
      "Rather than overwhelming you with hundreds of options, we help identify meaningful next steps.",
  },
  {
    title: "Built With Families in Mind",
    description:
      "The experience is designed to make navigating the autism journey easier, clearer, and less overwhelming.",
  },
];


export default function WhyChooseUs() {

  return (

    <Section>

      <Container>

        <Heading
          title="Why Families Choose Myriad Autism Journey"
          subtitle="A simpler way to understand what comes next and find guidance that fits your family's journey."
        />


        <div
          style={{
            display:
              "grid",

            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",

            gap:
              "24px",

            marginTop:
              "40px",
          }}
        >

          {reasons.map(
            (reason) => (

              <Card
                key={
                  reason.title
                }

                title={
                  reason.title
                }

                subtitle={
                  reason.description
                }
              >

                <div />

              </Card>

            )
          )}

        </div>

      </Container>

    </Section>

  );

}
export class Onboarding{
    async onboardingService(form) {
    const response = await fetch("http://localhost:5000/api/profile/onboarding", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(form),
    });
    console.log(response)
}

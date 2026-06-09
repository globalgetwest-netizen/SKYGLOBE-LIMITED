"use client";

import { useState } from "react";
import emailjs from "@emailjs/browser";

emailjs.init("nURZHfvE9Fjd4SmKb");

export default function Home() {
  const [form, setForm] = useState({
    fname: "",
    lname: "",
    email: "",
    phone: "",
    service: "",
    destination: "",
    message: "",
  });

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const sendEmail = async (e: any) => {
    e.preventDefault();

    try {
      await emailjs.send(
        "service_ldukpvg",
        "template_u40zqyv",
        {
          fname: form.fname,
          lname: form.lname,
          email: form.email,
          phone: form.phone,
          service: form.service,
          destination: form.destination,
          message: form.message,
        },
        "nURZHfvE9Fjd4SmKb"
      );

      alert("Message sent successfully!");
    } catch (error) {
      console.log(error);
      alert("Failed to send message");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>SKYGLOBE LIMITED</h1>

      <form onSubmit={sendEmail}>
        <input name="fname" placeholder="First Name" onChange={handleChange} />
        <br />
        <input name="lname" placeholder="Last Name" onChange={handleChange} />
        <br />
        <input name="email" placeholder="Email" onChange={handleChange} />
        <br />
        <input name="phone" placeholder="Phone" onChange={handleChange} />
        <br />
        <input name="service" placeholder="Service" onChange={handleChange} />
        <br />
        <input name="destination" placeholder="Destination" onChange={handleChange} />
        <br />
        <textarea name="message" placeholder="Message" onChange={handleChange} />
        <br />

        <button type="submit">Send</button>
      </form>
    </div>
  );
}
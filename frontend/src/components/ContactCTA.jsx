import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card, CardContent } from './ui/card';
import { ctaData } from '../mock';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const ContactCTA = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Mock submission
    console.log('Form submitted:', formData);
    setSubmitted(true);
    toast.success('Request submitted successfully! Our team will contact you within 24 hours.');
    
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', company: '', message: '' });
    }, 3000);
  };

  return (
    <section id="contact" className="py-24 bg-black relative overflow-hidden">
      {/* Dramatic background glow */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-full">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gradient-to-br from-zinc-900/90 to-black/90 border-amber-800/30 backdrop-blur-xl overflow-hidden">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-5 gap-0">
                {/* Left side - CTA Text */}
                <div className="md:col-span-2 bg-gradient-to-br from-amber-950/50 to-amber-900/30 p-8 md:p-10 flex flex-col justify-center border-r border-amber-800/20">
                  <div className="mb-6">
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-600/20 border border-amber-600/30 mb-4">
                      <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                      <span className="text-amber-200 text-xs tracking-wider font-medium">
                        EXCLUSIVE
                      </span>
                    </div>
                  </div>

                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                    {ctaData.title}
                  </h2>
                  <p className="text-amber-100/90 mb-6 leading-relaxed">
                    {ctaData.subtitle}
                  </p>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {ctaData.description}
                  </p>

                  <div className="mt-8 pt-6 border-t border-amber-800/30">
                    <p className="text-xs text-amber-200/70 italic">
                      {ctaData.note}
                    </p>
                  </div>
                </div>

                {/* Right side - Form */}
                <div className="md:col-span-3 p-8 md:p-10">
                  {!submitted ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-300">
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="bg-zinc-900/50 border-amber-900/30 focus:border-amber-600 text-white placeholder:text-gray-500 transition-colors duration-300"
                          placeholder="John Doe"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="bg-zinc-900/50 border-amber-900/30 focus:border-amber-600 text-white placeholder:text-gray-500 transition-colors duration-300"
                          placeholder="john@company.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-gray-300">
                          Company / Organization
                        </Label>
                        <Input
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="bg-zinc-900/50 border-amber-900/30 focus:border-amber-600 text-white placeholder:text-gray-500 transition-colors duration-300"
                          placeholder="Your Company Ltd"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-gray-300">
                          Tell us about your needs
                        </Label>
                        <Textarea
                          id="message"
                          name="message"
                          value={formData.message}
                          onChange={handleChange}
                          rows={4}
                          className="bg-zinc-900/50 border-amber-900/30 focus:border-amber-600 text-white placeholder:text-gray-500 resize-none transition-colors duration-300"
                          placeholder="I'm interested in..."
                        />
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-none shadow-lg shadow-amber-900/30 transition-all duration-300 group"
                      >
                        Submit Request
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" size={20} />
                      </Button>
                    </form>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-center animate-fade-in">
                      <div className="w-20 h-20 bg-gradient-to-br from-amber-600/20 to-amber-700/20 rounded-full flex items-center justify-center mb-6 animate-scale-in">
                        <CheckCircle2 className="text-amber-400" size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">
                        Request Received
                      </h3>
                      <p className="text-gray-400 max-w-sm">
                        Thank you for your interest. Our team will review your request and contact you shortly.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactCTA;

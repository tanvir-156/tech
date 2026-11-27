import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Header, MenuRow, T } from '../../components/ui';
import { Mark, Wordmark } from '../../components/Brand';

const FAQ = [
  ['How long does delivery take?', 'Most orders inside Dhaka arrive within 1–3 working days. Other districts usually take 3–5 working days after your order is confirmed.'],
  ['Can I cancel my order?', 'Yes. Open the order from My Orders and tap Cancel Order while it is still pending or confirmed.'],
  ['Which payment methods do you accept?', 'Cash on Delivery and online payment (cards, mobile banking and net banking) through SSLCommerz.'],
  ['Do products come with a warranty?', 'Warranty terms depend on the product and brand. Check the product page or ask a question there.'],
  ['How do I use a discount code?', 'Enter your code at checkout and tap Apply. The saving is shown before you place the order.'],
];

export function Help() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="Help & Support" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <T size={16} weight="bold" style={{ marginBottom: 10 }}>
          Frequently asked
        </T>
        <View style={{ gap: 10 }}>
          {FAQ.map(([q, a], i) => (
            <Card key={q} onPress={() => setOpen(open === i ? null : i)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <T weight="medium" size={13.5} style={{ flex: 1 }}>
                  {q}
                </T>
                <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
              </View>
              {open === i && (
                <T size={12.5} color={colors.text2} style={{ marginTop: 8, lineHeight: 20 }}>
                  {a}
                </T>
              )}
            </Card>
          ))}
        </View>
        <T size={16} weight="bold" style={{ marginTop: 22, marginBottom: 6 }}>
          Contact us
        </T>
        <Card padded={false} style={{ paddingHorizontal: 14 }}>
          <MenuRow icon="chatbubbles-outline" title="Ask on a product page" subtitle="Questions are answered by our team" />
          <MenuRow icon="mail-outline" title="Email support" subtitle="support@technest.com" onPress={() => void Linking.openURL('mailto:support@technest.com')} last />
        </Card>
      </ScrollView>
    </View>
  );
}

export function About() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Header title="About TechNest" />
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: 'center' }}>
        <View style={{ backgroundColor: colors.dark, borderRadius: 28, paddingVertical: 28, paddingHorizontal: 24, alignItems: 'center', width: '100%' }}>
          <Mark size={64} />
          <Wordmark size={28} />
          <T size={13} color="#D8CEC6" align="center" style={{ marginTop: 10 }}>
            Your trusted tech store
          </T>
        </View>
        <Card style={{ marginTop: 16, width: '100%' }}>
          <T size={13} color={colors.text2} style={{ lineHeight: 21 }}>
            TechNest brings laptops, phones, PC components, gaming gear and home electronics together in one place — with a PC builder that checks compatibility, genuine products, secure payments and tracked delivery.
          </T>
          <Pressable style={{ marginTop: 12 }}>
            <T size={12} color={colors.muted}>
              Version 1.0.0
            </T>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

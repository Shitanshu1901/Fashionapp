import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Platform, StatusBar, KeyboardAvoidingView,
} from 'react-native';
import { saveUserName, saveUserGender } from '../utils/storage';

const WARDROBE_OPTIONS = [
  {
    key: 'Men',
    emoji: '👔',
    label: 'Men',
    subtitle: 'Shirts, Kurtas, Blazers & more',
  },
  {
    key: 'Women',
    emoji: '👗',
    label: 'Women',
    subtitle: 'Tops, Kurtis, Sarees, Dresses & more',
  },
  {
    key: 'Kids',
    emoji: '🧒',
    label: 'Kids',
    subtitle: 'T-shirts, Dresses, Shorts & more',
  },
];

export default function ProfileSetupScreen({ onComplete }) {
  const [step, setStep]           = useState(1);
  const [name, setName]           = useState('');
  const [gender, setGender]       = useState(null);
  const [nameError, setNameError] = useState('');

  const handleNameNext = () => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Please enter at least 2 characters.');
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (!gender) return;
    await saveUserName(name.trim());
    await saveUserGender(gender);
    onComplete(name.trim(), gender);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Content block (top) ── */}
        <View>
          {/* Step indicator pills */}
          <View style={styles.stepRow}>
            <View style={[styles.stepPill, styles.stepPillActive]} />
            <View style={[styles.stepPill, step === 2 && styles.stepPillActive]} />
          </View>

          {step === 1 ? (
            /* ── Step 1: Name entry ──────────────────────── */
            <>
              <Text style={styles.eyebrow}>S T E P  1  O F  2</Text>
              <Text style={styles.title}>Your Personal{'\n'}Stylist</Text>
              <Text style={styles.subtitle}>
                Let's personalise your wardrobe experience.{'\n'}
                What should we call you?
              </Text>

              <Text style={styles.fieldLabel}>YOUR NAME</Text>
              <TextInput
                style={[styles.input, nameError ? styles.inputError : null]}
                placeholder="e.g. Sulay"
                placeholderTextColor="#C0B8B0"
                value={name}
                onChangeText={(t) => { setName(t); setNameError(''); }}
                autoFocus
                autoCapitalize="words"
                returnKeyType="next"
                onSubmitEditing={handleNameNext}
                maxLength={30}
              />
              {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}
            </>
          ) : (
            /* ── Step 2: Wardrobe style selection ───────── */
            <>
              <Text style={styles.eyebrow}>S T E P  2  O F  2</Text>
              <Text style={styles.title}>Wardrobe{'\n'}Style For</Text>
              <Text style={styles.subtitle}>
                This shapes your categories, style suggestions,
                and outfit logic throughout the app.
              </Text>

              <View style={styles.optionsContainer}>
                {WARDROBE_OPTIONS.map(opt => {
                  const selected = gender === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionCard, selected && styles.optionCardSelected]}
                      onPress={() => setGender(opt.key)}
                      activeOpacity={0.85}
                    >
                      {/* Emoji */}
                      <Text style={styles.optionEmoji}>{opt.emoji}</Text>

                      {/* Text block */}
                      <View style={styles.optionTextBlock}>
                        <Text style={[styles.optionLabel, selected && styles.selectedText]}>
                          {opt.label}
                        </Text>
                        <Text style={[styles.optionSubtitle, selected && styles.selectedSubtitle]}>
                          {opt.subtitle}
                        </Text>
                      </View>

                      {/* Radio circle */}
                      <View style={[styles.radio, selected && styles.radioSelected]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* ── CTA button (always at bottom) ── */}
        {step === 1 ? (
          <TouchableOpacity
            style={[styles.button, !name.trim() && styles.buttonDisabled]}
            onPress={handleNameNext}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Next →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, !gender && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={!gender}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>Let's Begin →</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0' },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 20 : 20,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },

  // ── Step pills ──
  stepRow: { flexDirection: 'row', marginBottom: 28 },
  stepPill: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#D0C8BF', marginRight: 6,
  },
  stepPillActive: { backgroundColor: '#1A1A1A', width: 22, borderRadius: 4 },

  // ── Typography ──
  eyebrow: {
    fontSize: 11, letterSpacing: 4, color: '#8A7E72',
    fontWeight: '600', marginBottom: 10,
  },
  title: {
    fontSize: 52, color: '#1A1A1A', fontFamily: 'FashionCalligraphy',
    lineHeight: 60, marginBottom: 14,
  },
  subtitle: {
    fontSize: 14, color: '#7A7065', lineHeight: 24, marginBottom: 28,
  },

  // ── Step 1 form ──
  fieldLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 2,
    color: '#8A7E72', marginBottom: 10,
  },
  input: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 18,
    fontSize: 18, color: '#1A1A1A', borderColor: '#EDE8DF',
    borderWidth: 1.5, fontWeight: '500',
  },
  inputError: { borderColor: '#E74C3C' },
  errorText: { color: '#E74C3C', fontSize: 12, marginTop: 8 },

  // ── Step 2 option cards ──
  optionsContainer: {
  marginTop: 0,
},
  optionCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 18,
    padding: 18, borderColor: '#EDE8DF', borderWidth: 1.5,
  },
  optionCardSelected: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  optionEmoji: { fontSize: 34, marginRight: 16 },
  optionTextBlock: { flex: 1 },
  optionLabel: { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  selectedText: { color: '#FAF6F0' },
  optionSubtitle: { fontSize: 12, color: '#8A7E72', lineHeight: 18 },
  selectedSubtitle: { color: '#A3998E' },

  // Radio circle
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#D0C8BF',
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: '#FAF6F0' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FAF6F0' },

  // ── CTA button ──
  button: {
    backgroundColor: '#1A1A1A', borderRadius: 30,
    paddingVertical: 18, alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#C0B8B0' },
  buttonText: { color: '#FAF6F0', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
});
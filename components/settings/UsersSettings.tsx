import { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthContext'
import { useToast } from '@/components/ui/toast-context'
import { Button } from '@/components/ui/Button'
import { UserProfile } from '@/types'

export function UsersSettings() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile?.household_id) loadMembers()
  }, [profile])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('household_id', profile!.household_id)
    setMembers(data ?? [])
    setLoading(false)
  }

  async function handleAddUser() {
    if (!newName.trim() || !newEmail.trim()) {
      toast({ title: 'שגיאה', description: 'יש למלא שם ואימייל', variant: 'destructive' })
      return
    }
    setSaving(true)
    toast({
      title: 'הוראות',
      description: 'יש ליצור את המשתמש בסופאבייס Auth ולהקצות לו את ה-household_id ידנית',
    })
    setSaving(false)
    setNewName('')
    setNewEmail('')
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>חברי משק הבית</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                {item.email && <Text style={styles.memberEmail}>{item.email}</Text>}
              </View>
              <View style={styles.badges}>
                {item.id === profile?.id && (
                  <View style={styles.badgeYou}>
                    <Text style={styles.badgeText}>אתה</Text>
                  </View>
                )}
                {item.is_admin && (
                  <View style={styles.badgeAdmin}>
                    <Text style={styles.badgeText}>מנהל</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          ListFooterComponent={
            <View style={styles.addSection}>
              <Text style={styles.sectionTitle}>הוסף משתמש</Text>
              <Text style={styles.hint}>
                לאחר הוספה, יש ליצור את המשתמש ב-Supabase Auth עם אותו אימייל ולהקצות לו את ה-household_id.
              </Text>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="שם"
                placeholderTextColor="#9ca3af"
                textAlign="right"
              />
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="אימייל"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
              />
              <Button onPress={handleAddUser} loading={saving}>הוסף</Button>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', textAlign: 'left', marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    gap: 8,
  },
  memberInfo: { flex: 1, alignItems: 'flex-start' },
  memberName: { fontSize: 15, fontWeight: '500', color: '#111827', textAlign: 'left' },
  memberEmail: { fontSize: 13, color: '#6b7280', textAlign: 'left' },
  badges: { flexDirection: 'row', gap: 4 },
  badgeYou: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeAdmin: { backgroundColor: '#fef9c3', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  addSection: { marginTop: 20, gap: 12 },
  hint: { fontSize: 13, color: '#9ca3af', textAlign: 'left', lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
    minHeight: 44,
  },
})

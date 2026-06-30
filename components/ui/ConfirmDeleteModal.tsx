import { View, Text, StyleSheet } from 'react-native'
import { Modal } from './Modal'
import { Button } from './Button'

type Props = {
  visible: boolean
  description: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDeleteModal({ visible, description, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} onClose={onCancel} title="אישור מחיקה">
      <View style={styles.body}>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.buttons}>
          <Button variant="destructive" onPress={onConfirm} style={styles.btn}>מחק</Button>
          <Button variant="outline" onPress={onCancel} style={styles.btn}>ביטול</Button>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  body: { gap: 20 },
  description: { fontSize: 16, color: '#374151', textAlign: 'left', lineHeight: 24 },
  buttons: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1 },
})

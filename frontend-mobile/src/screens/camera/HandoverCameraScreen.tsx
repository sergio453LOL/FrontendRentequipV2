import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Image, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { AppButton } from '../../components/AppButton'
import { useAction } from '../../hooks/useAction'
import { useCurrentLocation } from '../../hooks/useCurrentLocation'
import { useToast } from '../../hooks/useToast'
import type { RootScreenProps } from '../../navigation/types'
import { handoverService, type PhotoUpload } from '../../services/rentequipApi'
import { lightColors as colors, radius, spacing, typographyFor } from '../../theme'

/** The camera is a dark, full-screen view in both themes, so it uses fixed colours. */
const typography = typographyFor(colors)

const PHOTO_QUALITY = 0.6
const MAX_NOTE = 255

/**
 * Camera sensor (expo-camera) to document the equipment's condition at delivery or return. The photo is
 * uploaded with the GPS position (expo-location) when available. If the camera is denied or missing
 * (e.g. emulator), the user can still attach a photo from the gallery.
 */
export default function HandoverCameraScreen({ route, navigation }: RootScreenProps<'HandoverCamera'>) {
  const { t } = useTranslation()
  const { reservationId, stage } = route.params
  const toast = useToast()
  const location = useCurrentLocation()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef<CameraView>(null)
  const [facing, setFacing] = useState<CameraType>('back')
  const [torchOn, setTorchOn] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [cameraFailed, setCameraFailed] = useState(false)
  const [photo, setPhoto] = useState<PhotoUpload | null>(null)
  const [note, setNote] = useState('')
  const [progress, setProgress] = useState(0)
  const { run, isRunning } = useAction()
  const stageTitle = t(`camera.title.${stage}`)

  async function takePicture() {
    if (!cameraRef.current || !isReady || isCapturing) return
    setIsCapturing(true)
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: PHOTO_QUALITY })
      setPhoto({ uri: picture.uri, mimeType: 'image/jpeg' })
    } catch {
      toast.error(t('camera.captureFailed'), t('camera.captureFailedHint'))
    } finally {
      setIsCapturing(false)
    }
  }

  async function pickFromGallery() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: PHOTO_QUALITY })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType, fileName: asset.fileName })
    }
  }

  async function upload() {
    if (!photo) return
    setProgress(0)
    const coords = location.isFallback ? undefined : location.coords
    await run(
      () =>
        handoverService.upload(
          reservationId,
          photo,
          { stage, latitude: coords?.latitude, longitude: coords?.longitude, note: note.trim() || undefined },
          setProgress,
        ),
      { successMessage: t(`camera.saved.${stage}`), errorTitle: t('camera.uploadFailed'), onSuccess: () => navigation.goBack() },
    )
  }

  const header = (
    <View style={styles.header}>
      <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel={t('camera.close')} hitSlop={12}>
        <Ionicons name="close" size={28} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerTitle}>{stageTitle}</Text>
      <View style={{ width: 28 }} />
    </View>
  )

  // 1. Review the photo, add a note and upload it.
  if (photo) {
    return (
      <SafeAreaView style={styles.dark}>
        {header}
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Image source={{ uri: photo.uri }} style={styles.preview} resizeMode="contain" />
          <View style={styles.reviewPanel}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('camera.notePlaceholder')}
              placeholderTextColor="#94A3B8"
              maxLength={MAX_NOTE}
              multiline
              style={styles.noteInput}
              accessibilityLabel={t('camera.noteLabel')}
            />
            <Text style={styles.gpsInfo}>
              📍 {location.isFallback ? t('camera.noGps') : t('camera.withGps')}
            </Text>
            {isRunning && <Text style={styles.gpsInfo}>{t('camera.uploading', { progress })}</Text>}
            <View style={styles.row}>
              <AppButton title={t('camera.retake')} icon="refresh" variant="secondary" style={styles.flex} onPress={() => setPhoto(null)} disabled={isRunning} />
              <AppButton title={t('camera.save')} icon="cloud-upload-outline" style={styles.flex} onPress={upload} isLoading={isRunning} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  // 2. Permission not answered yet.
  if (!permission) {
    return (
      <SafeAreaView style={[styles.dark, styles.center]}>
        <ActivityIndicator color={colors.brand} size="large" />
      </SafeAreaView>
    )
  }

  // 3. No camera available: explain why and offer the gallery instead.
  if (!permission.granted || cameraFailed) {
    const deniedForever = !permission.granted && !permission.canAskAgain
    return (
      <SafeAreaView style={styles.dark}>
        {header}
        <View style={[styles.flex, styles.center, styles.fallback]}>
          <Ionicons name="camera-outline" size={56} color={colors.brand} />
          <Text style={styles.fallbackTitle}>{cameraFailed ? t('camera.unavailable') : t('camera.needAccess')}</Text>
          <Text style={styles.fallbackText}>
            {cameraFailed
              ? t('camera.unavailableHint')
              : t('camera.needAccessHint')}
          </Text>
          {!cameraFailed &&
            (deniedForever ? (
              <AppButton title={t('common.openSettings')} icon="settings-outline" onPress={() => void Linking.openSettings()} />
            ) : (
              <AppButton title={t('camera.allow')} icon="camera" onPress={() => void requestPermission()} />
            ))}
          <AppButton title={t('camera.fromGallery')} icon="images-outline" variant="secondary" onPress={pickFromGallery} />
        </View>
      </SafeAreaView>
    )
  }

  // 4. Live camera.
  return (
    <View style={styles.dark}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        enableTorch={torchOn}
        onCameraReady={() => setIsReady(true)}
        onMountError={() => setCameraFailed(true)}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {header}
        <View style={styles.guide} pointerEvents="none">
          <Text style={styles.guideText}>{t('camera.guide')}</Text>
        </View>
        <View style={styles.controls}>
          <Pressable onPress={pickFromGallery} style={styles.sideButton} accessibilityRole="button" accessibilityLabel={t('camera.fromGallery')}>
            <Ionicons name="images-outline" size={26} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={takePicture}
            disabled={!isReady || isCapturing}
            style={[styles.shutter, (!isReady || isCapturing) && styles.shutterDisabled]}
            accessibilityRole="button"
            accessibilityLabel={t('camera.take')}
          >
            {isCapturing ? <ActivityIndicator color={colors.ink} /> : <View style={styles.shutterInner} />}
          </Pressable>
          <View style={styles.sideColumn}>
            <Pressable onPress={() => setTorchOn((value) => !value)} style={styles.sideButton} accessibilityRole="button" accessibilityLabel={torchOn ? t('camera.torchOff') : t('camera.torchOn')}>
              <Ionicons name={torchOn ? 'flash' : 'flash-off'} size={24} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => setFacing((current) => (current === 'back' ? 'front' : 'back'))}
              style={styles.sideButton}
              accessibilityRole="button"
              accessibilityLabel={t('camera.flip')}
            >
              <Ionicons name="camera-reverse-outline" size={24} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#000000' },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  guide: { alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill },
  guideText: { color: '#FFFFFF', fontSize: 13 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingBottom: spacing.xl },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.brand },
  sideColumn: { gap: spacing.md },
  sideButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  preview: { flex: 1, width: '100%' },
  reviewPanel: { backgroundColor: colors.ink, padding: spacing.lg, gap: spacing.md },
  noteInput: { minHeight: 64, backgroundColor: '#1E293B', color: '#FFFFFF', borderRadius: radius.md, padding: spacing.md, fontSize: 15, textAlignVertical: 'top' },
  gpsInfo: { color: '#CBD5E1', fontSize: 13 },
  row: { flexDirection: 'row', gap: spacing.md },
  fallback: { padding: spacing.xl, gap: spacing.lg },
  fallbackTitle: { ...typography.heading, color: '#FFFFFF', textAlign: 'center' },
  fallbackText: { fontSize: 15, color: '#CBD5E1', textAlign: 'center' },
})

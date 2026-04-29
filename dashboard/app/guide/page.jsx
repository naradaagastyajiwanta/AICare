'use client'

import Card from '../../components/ui/Card'
import {
  BookOpen, Users, CheckSquare, ClipboardList,
  Megaphone, Brain, BarChart3, MessageCircle,
  HelpCircle, ChevronRight, HeartPulse, Phone,
  Plus, Search, Edit3, Power,
  Send, ImageIcon, FileText, QrCode, AlertTriangle,
  Star, LayoutDashboard, Clock,
} from 'lucide-react'
import { useState } from 'react'

const SECTIONS = [
  {
    id: 'overview',
    title: 'Overview (Beranda)',
    icon: LayoutDashboard,
    color: 'bg-primary-50 text-primary-600',
    content: [
      {
        title: 'Statistik Kartu',
        body: 'Berisi 4 metrik utama: Pasien Aktif, Reminder Terkirim, Kepatuhan Obat (%), dan Belum Merespons. Target kepatuhan ideal adalah ≥80%.',
        icon: BarChart3,
      },
      {
        title: 'Tren Kepatuhan',
        body: 'Grafik batang 7 hari terakhir. Batang hijau = pasien sudah minum obat, batang merah = belum minum.',
        icon: BarChart3,
      },
      {
        title: 'Breakdown Kategori',
        body: 'Donut chart yang menunjukkan proporsi reminder: Obat, Aktivitas Fisik, dan Pola Makan.',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'patients',
    title: 'Kelola Pasien',
    icon: Users,
    color: 'bg-success-50 text-success-600',
    content: [
      {
        title: 'Menambah Pasien Baru',
        body: 'Tap tombol biru "Tambah Pasien". Isi Nama, No. WhatsApp (format 628xxx), Nama Obat, dan Data Wali (opsional).',
        icon: Plus,
      },
      {
        title: 'Jadwal Pengingat',
        body: 'Satu pasien bisa punya banyak jadwal (pagi, siang, sore). Pilih jam, kategori (Obat/Aktivitas/Makan), dan label opsional.',
        icon: Clock,
      },
      {
        title: 'Mencari Pasien',
        body: 'Ketik nama, nomor WA, atau nama obat di kotak pencarian. Hasil muncul secara realtime.',
        icon: Search,
      },
      {
        title: 'Edit & Nonaktifkan',
        body: 'Tap tombol Edit (✏️) untuk ubah data. Toggle switch atau tombol Nonaktifkan untuk hentikan reminder.',
        icon: Edit3,
      },
    ],
  },
  {
    id: 'compliance',
    title: 'Kepatuhan Minum Obat',
    icon: CheckSquare,
    color: 'bg-warning-50 text-warning-600',
    content: [
      {
        title: 'Membaca Tabel',
        body: 'Baris = pasien. Kolom = tanggal. Badge: 🟢 Sudah | 🔴 Belum | 🟡 Tidak Jelas | ⚪ Tidak Merespons.',
        icon: CheckSquare,
      },
      {
        title: 'Rentang Waktu',
        body: 'Ganti periode di dropdown pojok kanan: 7 hari / 14 hari / 30 hari terakhir.',
        icon: Clock,
      },
      {
        title: 'Jika Banyak yang Belum Merespons',
        body: 'Cek halaman WhatsApp — pastikan status "Terhubung". Jika putus, scan QR ulang.',
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: 'reports',
    title: 'Laporan Harian',
    icon: ClipboardList,
    color: 'bg-info-50 text-info-600',
    content: [
      {
        title: 'Sistem Skoring',
        body: 'Obat (100 pts) + Aktivitas (100 pts) + Pola Makan (100 pts) = Total 300 pts.',
        icon: Star,
      },
      {
        title: 'Status "Luar Biasa"',
        body: 'Jika pasien dapat 300 pts sempurna, muncul badge ⭐ Luar Biasa dan sistem otomatis kirim motivasi via WhatsApp.',
        icon: Star,
      },
      {
        title: 'Grafik Score',
        body: 'Setiap pasien punya 3 gauge: Obat, Aktivitas, Makan. Plus progress bar total skor.',
        icon: BarChart3,
      },
    ],
  },
  {
    id: 'education',
    title: 'Edukasi & Broadcast',
    icon: Megaphone,
    color: 'bg-purple-50 text-purple-600',
    content: [
      {
        title: 'Tambah Materi',
        body: 'Tap "Tambah Materi" → upload gambar/poster (opsional) → pilih kategori → isi judul & konten → Simpan.',
        icon: ImageIcon,
      },
      {
        title: 'Broadcast Pesan',
        body: 'Menu Broadcast → tulis pesan → tap "Kirim ke Semua Pasien". Atau gunakan template dari materi edukasi.',
        icon: Send,
      },
      {
        title: 'Riwayat Broadcast',
        body: 'Kolom kanan menampilkan semua pesan yang pernah dikirim beserta jumlah penerima dan tanggal.',
        icon: Clock,
      },
    ],
  },
  {
    id: 'knowledge',
    title: 'Knowledge Base (RAG)',
    icon: Brain,
    color: 'bg-orange-50 text-orange-600',
    content: [
      {
        title: 'Cara Kerja RAG',
        body: 'AI mencari dokumen paling relevan di Knowledge Base saat pasien bertanya. Semakin banyak dokumen yang berkualitas, semakin pintar jawaban AI.',
        icon: Brain,
      },
      {
        title: 'Tambah Dokumen Manual',
        body: 'Tap "Tambah" → pilih kategori (Penyakit/Obat/Gaya Hidup/Posyandu/Umum) → isi judul & konten → Simpan.',
        icon: Plus,
      },
      {
        title: 'Upload DOCX (Bulk)',
        body: 'Tap "Upload DOCX" → pilih file Word → sistem otomatis pecah jadi chunks → pilih yang ingin disimpan → Simpan.',
        icon: FileText,
      },
      {
        title: 'Aktif / Nonaktif',
        body: 'Tap tombol status pada setiap dokumen. Dokumen nonaktif tidak akan digunakan AI untuk menjawab.',
        icon: Power,
      },
    ],
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Connection',
    icon: MessageCircle,
    color: 'bg-emerald-50 text-emerald-600',
    content: [
      {
        title: 'Scan QR Code',
        body: 'Buka WhatsApp di HP → Menu → Perangkat Tertaut → Tautkan Perangkat Baru → scan QR di layar dashboard.',
        icon: QrCode,
      },
      {
        title: 'Status Indikator',
        body: '🟢 Terhubung = siap pakai | 🔵 Menunggu QR = perlu scan | 🔴 Terputus = hubungkan ulang | 🟡 Menghubungkan = tunggu sebentar.',
        icon: AlertTriangle,
      },
      {
        title: 'Hubungkan Ulang',
        body: 'Tap tombol biru "Hubungkan Ulang / Tampilkan QR Baru" jika QR kadaluarsa atau koneksi putus.',
        icon: Phone,
      },
    ],
  },
]

function SectionCard({ section }) {
  const [open, setOpen] = useState(false)
  const Icon = section.icon

  return (
    <Card padding="none" className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-50/50"
      >
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${section.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-surface-900">{section.title}</h3>
          <p className="text-xs text-surface-400 mt-0.5">{section.content.length} topik</p>
        </div>
        <ChevronRight className={`w-5 h-5 text-surface-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-surface-100">
          {section.content.map((item, idx) => {
            const ItemIcon = item.icon
            return (
              <div key={idx} className="flex gap-3 pt-3 first:pt-3">
                <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center shrink-0 mt-0.5">
                  <ItemIcon className="w-4 h-4 text-surface-500" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-surface-800">{item.title}</h4>
                  <p className="text-xs text-surface-500 leading-relaxed mt-0.5">{item.body}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default function GuidePage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">Panduan Pengguna</h1>
        <p className="text-sm text-surface-500 mt-1">
          Pelajari cara menggunakan AICare Dashboard untuk monitoring pasien Posyandu
        </p>
      </div>

      {/* Quick cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card padding="md" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Total Topik</p>
            <p className="text-lg font-bold text-surface-900">{SECTIONS.reduce((a, s) => a + s.content.length, 0)}</p>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-50 flex items-center justify-center shrink-0">
            <HeartPulse className="w-5 h-5 text-success-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">Fitur Utama</p>
            <p className="text-lg font-bold text-surface-900">{SECTIONS.length}</p>
          </div>
        </Card>
        <Card padding="md" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-warning-50 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-warning-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">FAQ</p>
            <p className="text-lg font-bold text-surface-900">8</p>
          </div>
        </Card>
      </div>

      {/* FAQ Banner */}
      <div className="mb-6 bg-primary-50 border border-primary-200 rounded-2xl px-4 py-3 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-primary-600 mt-0.5 shrink-0" />
        <div className="text-xs text-primary-800">
          <p className="font-bold mb-0.5">Butuh bantuan cepat?</p>
          <p className="leading-relaxed">
            Jika mengalami masalah teknis, hubungi tim developer di{' '}
            <a href="https://NAJWorks.com" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-primary-600">
              NAJWorks.com
            </a>
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map(section => (
          <SectionCard key={section.id} section={section} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-surface-400">
          AICare Dashboard v2.0 — Dibuat oleh{' '}
          <a href="https://NAJWorks.com" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-bold hover:underline">
            NAJWorks.com
          </a>
        </p>
      </div>
    </div>
  )
}

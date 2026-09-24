import Image from 'next/image';

export default function HuntCard({ hunt }) {
  const { coverImageUrl, title } = hunt;
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
      <Image
        src={coverImageUrl}
        alt={title}
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        placeholder="blur"
        blurDataURL="data:image/gif;base64,R0lGODhqQABAIAAAAAPPP///YH5BAEAAAAALAAAAABAAEAAAIBRAA7"
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}

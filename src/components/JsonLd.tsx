interface JsonLdProps {
  data: (object | null | undefined) | (object | null | undefined)[];
}

const JsonLd = ({ data }: JsonLdProps) => {
  const jsonLdArray = (Array.isArray(data) ? data : [data]).filter(Boolean) as object[];

  if (!jsonLdArray.length) return null;

  return (
    <>
      {jsonLdArray.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
};

export default JsonLd;

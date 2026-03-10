#!/bin/bash
cd C:\Users\HIEU\PycharmProjects\NovaTutor_AI\frontend
echo "Starting build at $(date)"
npm run build
BUILD_EXIT=$?
echo "Build exit code: $BUILD_EXIT"

if [ $BUILD_EXIT -eq 0 ]; then
  echo "✅ BUILD SUCCESSFUL"
  if [ -d .next ]; then
    echo "✅ .next folder created"
    du -sh .next
  fi
else
  echo "❌ BUILD FAILED"
  exit 1
fi

